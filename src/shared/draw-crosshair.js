/**
 * Crosshair Overlay v2.0 - Shared Crosshair Drawing Engine
 * Single source of truth for both overlay renderer and settings preview canvas.
 */

function drawRoundRectPath(targetCtx, x, y, w, h, radius) {
  targetCtx.beginPath();
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) {
    targetCtx.rect(x, y, w, h);
  } else if (typeof targetCtx.roundRect === 'function') {
    targetCtx.roundRect(x, y, w, h, r);
  } else {
    targetCtx.moveTo(x + r, y);
    targetCtx.lineTo(x + w - r, y);
    targetCtx.quadraticCurveTo(x + w, y, x + w, y + r);
    targetCtx.lineTo(x + w, y + h - r);
    targetCtx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    targetCtx.lineTo(x + r, y + h);
    targetCtx.quadraticCurveTo(x, y + h, x, y + h - r);
    targetCtx.lineTo(x, y + r);
    targetCtx.quadraticCurveTo(x, y, x + r, y);
    targetCtx.closePath();
  }
}

function drawSegment(targetCtx, cx, cy, dx, dy, startOffset, length, thickness, color, shapeCap = 'square') {
  if (length <= 0 || thickness <= 0) return;
  const x1 = cx + dx * startOffset;
  const y1 = cy + dy * startOffset;
  const x2 = cx + dx * (startOffset + length);
  const y2 = cy + dy * (startOffset + length);

  targetCtx.beginPath();
  targetCtx.moveTo(x1, y1);
  targetCtx.lineTo(x2, y2);
  targetCtx.lineWidth = thickness;
  targetCtx.strokeStyle = color;
  targetCtx.lineCap = shapeCap;
  targetCtx.stroke();
}

function drawCrosshair(targetCtx, cx, cy, config) {
  if (!config || !targetCtx) return;

  const shape = config.shape || 'cross';
  const size = config.size !== undefined ? Math.max(1, Number(config.size)) : 24;
  const rawSizeX = config.sizeX !== undefined ? Math.max(1, Number(config.sizeX)) : size;
  const rawSizeY = config.sizeY !== undefined ? Math.max(1, Number(config.sizeY)) : size;
  // Mode Linked (unlinkSize=false): pakai `size` untuk kedua sumbu.
  // Tanpa ini, state seperti size=20 tapi sizeX=6/sizeY=4 menggambar
  // crosshair 6px yang tak terlihat padahal user merasa set 20.
  const linked = !config.unlinkSize;
  const sizeX = linked ? size : rawSizeX;
  const sizeY = linked ? size : rawSizeY;
  const thickness = config.thickness !== undefined ? Math.max(0.5, Number(config.thickness)) : 2;
  const gap = config.gap !== undefined ? Math.max(0, Number(config.gap)) : 4;
  const cornerRadius = config.cornerRadius !== undefined ? Math.max(0, Number(config.cornerRadius)) : 0;
  const color = config.color || '#00ffcc';
  const outline = config.outline || {};
  const centerDot = config.centerDot || {};
  const outerLines = config.outerLines || {};
  const arms = config.arms || { top: true, left: true, right: true, bottom: true };

  // Save alpha state and apply rotation
  const prevAlpha = targetCtx.globalAlpha;
  const baseOpacity = config.opacity !== undefined ? Number(config.opacity) : 100;
  const effectiveBaseAlpha = prevAlpha * Math.max(0, Math.min(1, baseOpacity / 100));

  const rotation = Number(config.rotation) || 0;
  const needsRotate = (rotation % 360) !== 0;
  if (needsRotate) {
    targetCtx.save();
    targetCtx.translate(cx, cy);
    targetCtx.rotate((rotation * Math.PI) / 180);
    targetCtx.translate(-cx, -cy);
  }

  // Determine active arms based on shape
  let drawTop = false;
  let drawBottom = false;
  let drawLeft = false;
  let drawRight = false;
  let drawCircle = false;
  let drawBox = false;
  let isDotOnly = false;

  if (shape === 'cross') {
    drawTop = arms.top !== false;
    drawBottom = arms.bottom !== false;
    drawLeft = arms.left !== false;
    drawRight = arms.right !== false;
  } else if (shape === 't-shape') {
    drawTop = false;
    drawBottom = arms.bottom !== false;
    drawLeft = arms.left !== false;
    drawRight = arms.right !== false;
  } else if (shape === 'circle') {
    drawCircle = true;
  } else if (shape === 'box') {
    drawBox = true;
  } else if (shape === 'dot') {
    isDotOnly = true;
  }

  const outlineEnabled = !!outline.enabled;
  const outlineWidth = Number(outline.width) || 1;
  const outlineColor = outline.color || '#000000';
  const outlineOpacity = outline.opacity !== undefined ? Math.max(0, Math.min(100, Number(outline.opacity))) : 100;
  const totalThickness = thickness + outlineWidth * 2;
  const lineCap = cornerRadius > 0 ? 'round' : 'square';

  // ─── 1. Outline Pass ──────────────────────────────────────────────
  if (outlineEnabled && outlineWidth > 0 && outlineOpacity > 0) {
    targetCtx.globalAlpha = effectiveBaseAlpha * (outlineOpacity / 100);

    // Center dot outline
    if (centerDot.enabled && !isDotOnly && !drawCircle && !drawBox) {
      const dotSize = Number(centerDot.size) || 4;
      const dotR = cornerRadius > 0 ? Math.min(cornerRadius, (dotSize / 2) + outlineWidth) : 0;
      if (dotR === 0) {
        targetCtx.fillStyle = outlineColor;
        targetCtx.fillRect(
          cx - (dotSize / 2) - outlineWidth,
          cy - (dotSize / 2) - outlineWidth,
          dotSize + outlineWidth * 2,
          dotSize + outlineWidth * 2
        );
      } else {
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, (dotSize / 2) + outlineWidth, 0, Math.PI * 2);
        targetCtx.fillStyle = outlineColor;
        targetCtx.fill();
      }
    }

    // Dot shape outline
    if (isDotOnly) {
      const dotR = cornerRadius > 0 ? Math.min(cornerRadius, (size / 2) + outlineWidth) : 0;
      if (dotR === 0) {
        targetCtx.fillStyle = outlineColor;
        targetCtx.fillRect(
          cx - (size / 2) - outlineWidth,
          cy - (size / 2) - outlineWidth,
          size + outlineWidth * 2,
          size + outlineWidth * 2
        );
      } else {
        drawRoundRectPath(
          targetCtx,
          cx - (size / 2) - outlineWidth,
          cy - (size / 2) - outlineWidth,
          size + outlineWidth * 2,
          size + outlineWidth * 2,
          dotR
        );
        targetCtx.fillStyle = outlineColor;
        targetCtx.fill();
      }
    }

    // Circle shape outline
    if (drawCircle) {
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      targetCtx.lineWidth = totalThickness;
      targetCtx.strokeStyle = outlineColor;
      targetCtx.stroke();
    }

    // Box shape outline
    if (drawBox) {
      const boxW = sizeX;
      const boxH = sizeY;
      const boxX = cx - boxW / 2;
      const boxY = cy - boxH / 2;
      drawRoundRectPath(targetCtx, boxX, boxY, boxW, boxH, cornerRadius);
      targetCtx.lineWidth = totalThickness;
      targetCtx.strokeStyle = outlineColor;
      targetCtx.stroke();
    }

    // Line segments outline (Inner Lines)
    if (!isDotOnly && !drawCircle && !drawBox) {
      if (drawTop)    drawSegment(targetCtx, cx, cy, 0, -1, gap, sizeY, totalThickness, outlineColor, lineCap);
      if (drawBottom) drawSegment(targetCtx, cx, cy, 0, 1, gap, sizeY, totalThickness, outlineColor, lineCap);
      if (drawLeft)   drawSegment(targetCtx, cx, cy, -1, 0, gap, sizeX, totalThickness, outlineColor, lineCap);
      if (drawRight)  drawSegment(targetCtx, cx, cy, 1, 0, gap, sizeX, totalThickness, outlineColor, lineCap);
    }

    // Outer Lines outline (if enabled)
    if (outerLines.enabled) {
      const oSize = Math.max(1, Number(outerLines.size) || 4);
      const oThick = Math.max(0.5, Number(outerLines.thickness) || 2);
      const oGap = Math.max(0, Number(outerLines.gap) !== undefined ? Number(outerLines.gap) : 10);
      const oTotalThick = oThick + outlineWidth * 2;
      if (drawTop || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 0, -1, oGap, oSize, oTotalThick, outlineColor, lineCap);
      if (drawBottom || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 0, 1, oGap, oSize, oTotalThick, outlineColor, lineCap);
      if (drawLeft || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, -1, 0, oGap, oSize, oTotalThick, outlineColor, lineCap);
      if (drawRight || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 1, 0, oGap, oSize, oTotalThick, outlineColor, lineCap);
    }
  }

  // ─── 2. Core Fill / Stroke Pass ───────────────────────────────────
  // Default to main opacity
  targetCtx.globalAlpha = effectiveBaseAlpha;

  // Center dot core
  if (centerDot.enabled && !isDotOnly && !drawCircle && !drawBox) {
    const dotOpacity = centerDot.opacity !== undefined ? Math.max(0, Math.min(100, Number(centerDot.opacity))) : 100;
    targetCtx.globalAlpha = effectiveBaseAlpha * (dotOpacity / 100);

    const dotSize = Number(centerDot.size) || 4;
    const dotR = cornerRadius > 0 ? Math.min(cornerRadius, dotSize / 2) : 0;
    if (dotR === 0) {
      targetCtx.fillStyle = color;
      targetCtx.fillRect(cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize);
    } else {
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
      targetCtx.fillStyle = color;
      targetCtx.fill();
    }
    targetCtx.globalAlpha = effectiveBaseAlpha;
  }

  // Dot shape core
  if (isDotOnly) {
    const dotR = cornerRadius > 0 ? Math.min(cornerRadius, size / 2) : 0;
    if (dotR === 0) {
      targetCtx.fillStyle = color;
      targetCtx.fillRect(cx - size / 2, cy - size / 2, size, size);
    } else {
      drawRoundRectPath(targetCtx, cx - size / 2, cy - size / 2, size, size, dotR);
      targetCtx.fillStyle = color;
      targetCtx.fill();
    }
  }

  // Circle shape core
  if (drawCircle) {
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    targetCtx.lineWidth = thickness;
    targetCtx.strokeStyle = color;
    targetCtx.stroke();
  }

  // Box shape core
  if (drawBox) {
    const boxW = sizeX;
    const boxH = sizeY;
    const boxX = cx - boxW / 2;
    const boxY = cy - boxH / 2;
    drawRoundRectPath(targetCtx, boxX, boxY, boxW, boxH, cornerRadius);
    targetCtx.lineWidth = thickness;
    targetCtx.strokeStyle = color;
    targetCtx.stroke();
  }

  // Line segments core (Inner Lines)
  if (!isDotOnly && !drawCircle && !drawBox) {
    if (drawTop)    drawSegment(targetCtx, cx, cy, 0, -1, gap, sizeY, thickness, color, lineCap);
    if (drawBottom) drawSegment(targetCtx, cx, cy, 0, 1, gap, sizeY, thickness, color, lineCap);
    if (drawLeft)   drawSegment(targetCtx, cx, cy, -1, 0, gap, sizeX, thickness, color, lineCap);
    if (drawRight)  drawSegment(targetCtx, cx, cy, 1, 0, gap, sizeX, thickness, color, lineCap);
  }

  // ─── 3. Outer Lines Pass ──────────────────────────────────────────
  if (outerLines.enabled) {
    const oSize = Math.max(1, Number(outerLines.size) || 4);
    const oThick = Math.max(0.5, Number(outerLines.thickness) || 2);
    const oGap = Math.max(0, Number(outerLines.gap) !== undefined ? Number(outerLines.gap) : 10);
    const oOpacity = outerLines.opacity !== undefined ? Math.max(0, Math.min(100, Number(outerLines.opacity))) : 100;
    const oColor = outerLines.color || color;

    targetCtx.globalAlpha = effectiveBaseAlpha * (oOpacity / 100);
    if (drawTop || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 0, -1, oGap, oSize, oThick, oColor, lineCap);
    if (drawBottom || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 0, 1, oGap, oSize, oThick, oColor, lineCap);
    if (drawLeft || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, -1, 0, oGap, oSize, oThick, oColor, lineCap);
    if (drawRight || isDotOnly || drawCircle || drawBox) drawSegment(targetCtx, cx, cy, 1, 0, oGap, oSize, oThick, oColor, lineCap);
  }

  // Restore state
  targetCtx.globalAlpha = prevAlpha;
  if (needsRotate) {
    targetCtx.restore();
  }
}

// Support CommonJS & Browser Window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { drawCrosshair, drawSegment };
}
if (typeof window !== 'undefined') {
  window.drawCrosshair = drawCrosshair;
  window.drawSegment = drawSegment;
}
