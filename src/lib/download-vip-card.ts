/**
 * Helper to generate and download a high-resolution PNG of a VIP Digital Member Card.
 * Runs completely client-side using HTML5 Canvas with crossOrigin handling.
 */
export async function downloadVipCardImage(params: {
  guestName: string;
  token: string;
  tier?: string;
  qrCodeUrl?: string | null;
}): Promise<void> {
  const width = 900;
  const height = 540;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const drawRoundedRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  };

  // 1. Background Gradient (Sleek Dark Premium)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#2a080d");
  bgGrad.addColorStop(0.5, "#150306");
  bgGrad.addColorStop(1, "#0a0103");
  ctx.fillStyle = bgGrad;
  drawRoundedRect(0, 0, width, height, 36);
  ctx.fill();

  // Outer Border Glow
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner Gold Accent Line
  const goldLine = ctx.createLinearGradient(0, 0, width, 0);
  goldLine.addColorStop(0, "rgba(245, 158, 11, 0.7)");
  goldLine.addColorStop(0.5, "rgba(251, 191, 36, 0.3)");
  goldLine.addColorStop(1, "rgba(245, 158, 11, 0.7)");
  ctx.strokeStyle = goldLine;
  ctx.lineWidth = 2;
  drawRoundedRect(20, 20, width - 40, height - 40, 24);
  ctx.stroke();

  // 2. Header Brand
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("ROOM A CERITARASA", 55, 75);

  // VIP Member Badge
  const tierText = (params.tier || "VIP MEMBER").toUpperCase();
  ctx.fillStyle = "#fbbf24";
  ctx.font = "italic bold 24px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(tierText, width - 55, 75);
  ctx.textAlign = "left"; // reset

  // 3. Gold Metallic Chip
  const chipGrad = ctx.createLinearGradient(55, 140, 145, 200);
  chipGrad.addColorStop(0, "#fef08a");
  chipGrad.addColorStop(0.5, "#d97706");
  chipGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = chipGrad;
  drawRoundedRect(55, 140, 90, 60, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chip Detail Lines
  ctx.strokeStyle = "rgba(120, 53, 15, 0.6)";
  ctx.beginPath();
  ctx.moveTo(55, 170); ctx.lineTo(145, 170);
  ctx.moveTo(100, 140); ctx.lineTo(100, 200);
  ctx.stroke();

  // 4. Guest Name Section
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SPECIALLY ISSUED TO", 55, 410);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";

  // Truncate name if too long to avoid overlapping QR code
  let displayName = params.guestName;
  if (displayName.length > 22) {
    displayName = `${displayName.slice(0, 20)}...`;
  }
  ctx.fillText(displayName, 55, 450);

  // Token Serial Code
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`TOKEN: ${params.token}`, 55, 488);

  // 5. QR Code Draw (Bottom Right)
  const qrSrc =
    params.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${params.token}&margin=0`;

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const qrSize = 160;
      const qrX = width - qrSize - 65;
      const qrY = height - qrSize - 55;

      // QR White Background Card
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 20);
      ctx.fill();

      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      resolve();
    };
    img.onerror = () => {
      // Draw fallback text box if QR image fails to load
      const qrSize = 160;
      const qrX = width - qrSize - 65;
      const qrY = height - qrSize - 55;
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 20);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 12px monospace";
      ctx.fillText(params.token, qrX + 10, qrY + 80);
      resolve();
    };
    img.src = qrSrc;
  });

  // 6. Trigger Download
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const filename = `VIP-Card-${params.guestName.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
