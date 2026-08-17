/**
 * Helper to generate and download a high-resolution PNG of a VIP Digital Member Card.
 * Keeps original premium dark card layout with correct "Rooma Ceritarasa" branding
 * and a prominent large centered QR code / barcode.
 */
export async function downloadVipCardImage(params: {
  guestName: string;
  token: string;
  qrCodeUrl?: string | null;
  issuedAt?: string | null;
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

  // 2. Header Brand: "Rooma Ceritarasa" (Top Left)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText("Rooma Ceritarasa", 55, 75);

  // VIP Member Badge (Top Right)
  const tierText = "VIP MEMBER";
  ctx.fillStyle = "#fbbf24";
  ctx.font = "italic bold 24px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(tierText, width - 55, 75);
  ctx.textAlign = "left"; // reset

  // 3. Gold Metallic Chip (Mid Left)
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

  // 4. Large Centered Barcode / QR Code Box (PROMINENT CENTER)
  const boxSize = 270;
  const qrBoxX = (width - boxSize) / 2; // 315
  const qrBoxY = (height - boxSize) / 2; // 135

  const qrSrc =
    params.qrCodeUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${params.token}&margin=0`;

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // White Rounded Background Box for QR
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(qrBoxX, qrBoxY, boxSize, boxSize, 24);
      ctx.fill();

      // QR Image inside box with margin
      const padding = 18;
      const imgSize = boxSize - padding * 2; // 234px
      ctx.drawImage(img, qrBoxX + padding, qrBoxY + padding, imgSize, imgSize);
      resolve();
    };
    img.onerror = () => {
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(qrBoxX, qrBoxY, boxSize, boxSize, 24);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 12px monospace";
      ctx.fillText(params.token.slice(0, 16), qrBoxX + 20, qrBoxY + 135);
      resolve();
    };
    img.src = qrSrc;
  });

  // 5. Guest Name & Token Section (Bottom Left - Original Structure)
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("SPECIALLY ISSUED TO", 55, 410);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px sans-serif";

  let displayName = params.guestName.toUpperCase();
  if (displayName.length > 28) {
    displayName = `${displayName.slice(0, 26)}...`;
  }
  ctx.fillText(displayName, 55, 450);



  // 6. Trigger PNG Download
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  const filename = `VIP-Card-${params.guestName.replace(/[^a-zA-Z0-9]/g, "-")}.png`;
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
