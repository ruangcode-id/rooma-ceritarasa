import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const apiRoot = join(projectRoot, "src", "app", "api");
const httpMethods = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function findRouteFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return findRouteFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

function getExportedHttpMethods(sourceFile) {
  return sourceFile.statements.filter((statement) => {
    if (!ts.isFunctionDeclaration(statement) || !statement.name || !statement.body) {
      return false;
    }

    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );

    return isExported && httpMethods.has(statement.name.text);
  });
}

function getPropertyName(property) {
  if (!property.name) return null;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return null;
}

test("every admin and owner API method applies its server-side role guard", () => {
  const namespaces = [
    { directory: join(apiRoot, "admin"), helper: "requireAdminApiSession" },
    { directory: join(apiRoot, "owner"), helper: "requireOwnerApiSession" },
  ];
  let checkedMethodCount = 0;

  for (const { directory, helper } of namespaces) {
    for (const routeFile of findRouteFiles(directory)) {
      const source = readFileSync(routeFile, "utf8");
      const sourceFile = ts.createSourceFile(
        routeFile,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const methods = getExportedHttpMethods(sourceFile);

      assert.ok(methods.length > 0, `${relative(projectRoot, routeFile)} has no HTTP method`);

      for (const method of methods) {
        checkedMethodCount += 1;
        assert.match(
          method.body.getText(sourceFile),
          new RegExp(`await\\s+${helper}\\s*\\(`),
          `${relative(projectRoot, routeFile)}:${method.name.text} must call ${helper}`,
        );
      }
    }
  }

  assert.ok(checkedMethodCount > 0, "no protected API methods were checked");
});

test("protected API error objects use the success/error envelope", () => {
  const protectedDirectories = [join(apiRoot, "admin"), join(apiRoot, "owner")];
  let checkedErrorCount = 0;

  for (const directory of protectedDirectories) {
    for (const routeFile of findRouteFiles(directory)) {
      const source = readFileSync(routeFile, "utf8");
      const sourceFile = ts.createSourceFile(
        routeFile,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );

      function visit(node) {
        if (ts.isObjectLiteralExpression(node)) {
          const properties = new Map(
            node.properties.map((property) => [getPropertyName(property), property]),
          );
          const success = properties.get("success");

          if (
            success &&
            ts.isPropertyAssignment(success) &&
            success.initializer.kind === ts.SyntaxKind.FalseKeyword
          ) {
            checkedErrorCount += 1;
            assert.ok(
              properties.has("error"),
              `${relative(projectRoot, routeFile)} has success:false without error`,
            );
            assert.equal(
              properties.has("message"),
              false,
              `${relative(projectRoot, routeFile)} uses message instead of error`,
            );
            assert.equal(
              properties.has("detail"),
              false,
              `${relative(projectRoot, routeFile)} exposes an internal detail field`,
            );
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }
  }

  assert.ok(checkedErrorCount > 0, "no protected API error envelopes were checked");
});

test("auth helpers keep distinct 401 and 403 responses", () => {
  const helperExpectations = [
    {
      file: join(projectRoot, "src", "lib", "require-admin-api.ts"),
      allowedRoles: [/role !== "admin"/, /role !== "owner"/],
    },
    {
      file: join(projectRoot, "src", "lib", "require-owner-api.ts"),
      allowedRoles: [/role !== "owner"/],
    },
  ];

  for (const { file, allowedRoles } of helperExpectations) {
    const source = readFileSync(file, "utf8");

    assert.match(source, /jsonError\("Unauthorized",\s*401\)/);
    assert.match(source, /jsonError\("Forbidden",\s*403\)/);
    for (const roleCheck of allowedRoles) assert.match(source, roleCheck);
  }
});
