import React, { useEffect, useRef } from 'react';

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Symbols representative of Cebu Tech, IE matrix, and mathematical operations
    const matrixSymbols = [
      'I', 'E', 'M', 'A', 'T', 'R', 'I', 'X', 'C', 'T', 'U', 
      '0', '1', '∑', '∫', 'λ', 'μ', 'σ', 'η', 'φ', 'Δ', '√', 'π', 
      '⚙', '⌛', '🔍', '⊞', '×', '÷', '='
    ];

    const fontSize = 14;
    const columns = Math.ceil(width / fontSize);

    // Track active falling stream configurations
    const rainDrops: { y: number; speed: number; chars: string[] }[] = [];
    for (let x = 0; x < columns; x++) {
      rainDrops[x] = {
        y: Math.random() * -height,
        speed: 1 + Math.random() * 2,
        // Pre-populate some random chars to avoid computing on every frames
        chars: Array.from({ length: 20 }, () => matrixSymbols[Math.floor(Math.random() * matrixSymbols.length)]),
      };
    }

    // Tessellation polygon mesh coordinates to match the provided logo background
    const points: { x: number; y: number; originX: number; originY: number; vx: number; vy: number }[] = [];
    const pointCount = Math.min(60, Math.floor((width * height) / 32000));

    for (let i = 0; i < pointCount; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      points.push({
        x: rx,
        y: ry,
        originX: rx,
        originY: ry,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      });
    }

    // Handles interactive parallax of the polygonal network base on mouse position
    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      // Adjust falling rains
      const newColumns = Math.ceil(width / fontSize);
      if (newColumns > rainDrops.length) {
        for (let x = rainDrops.length; x < newColumns; x++) {
          rainDrops[x] = {
            y: Math.random() * -height,
            speed: 1 + Math.random() * 2,
            chars: Array.from({ length: 20 }, () => matrixSymbols[Math.floor(Math.random() * matrixSymbols.length)]),
          };
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Frame Core Loop
    const draw = () => {
      // Clear canvas with adaptive transparency depending on dark/light HTML body class
      const isDark = document.documentElement.classList.contains('dark');
      
      if (isDark) {
        // High fidelity deep dark cybernet backdrop
        ctx.fillStyle = 'rgba(9, 13, 20, 0.22)';
      } else {
        // Gentle premium white drafting sheet backdrop
        ctx.fillStyle = 'rgba(248, 250, 252, 0.25)';
      }
      ctx.fillRect(0, 0, width, height);

      // ----------------------------------------------------
      // Drawing Phase 1: Holographic Polygonal Tessellation Grid (Logo Style)
      // ----------------------------------------------------
      ctx.lineWidth = 0.8;

      // Update and connect points
      points.forEach((p) => {
        // Soft swaying movement
        p.x += p.vx;
        p.y += p.vy;

        // Bounce boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Subtle mouse dynamic gravitational influence
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 260) {
          p.x += (dx / dist) * 0.15;
          p.y += (dy / dist) * 0.15;
        } else {
          // Soft restore to origin vector path
          p.x += (p.originX - p.x) * 0.005;
          p.y += (p.originY - p.y) * 0.005;
        }
      });

      // Render triangles / lines
      for (let i = 0; i < points.length; i++) {
        let connections = 0;
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Connect nearby nodes to form poly-mesh
          if (dist < 180 && connections < 4) {
            connections++;
            const alpha = (1 - dist / 180) * (isDark ? 0.08 : 0.05);
            ctx.strokeStyle = isDark ? `rgba(16, 185, 129, ${alpha})` : `rgba(217, 119, 6, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }

        // Draw node points
        const isCloseToMouse = Math.sqrt(mouseX - points[i].x) + Math.sqrt(mouseY - points[i].y) < 120;
        ctx.fillStyle = isDark 
          ? (isCloseToMouse ? 'rgba(52, 211, 153, 0.4)' : 'rgba(16, 185, 129, 0.15)') 
          : 'rgba(217, 119, 6, 0.1)';
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, isCloseToMouse ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ----------------------------------------------------
      // Drawing Phase 2: Silent Cybernetic Cascade Streams (Matrix Cascade)
      // ----------------------------------------------------
      ctx.textAlign = 'center';
      
      for (let i = 0; i < rainDrops.length; i++) {
        // Stream positions updated
        const drop = rainDrops[i];
        drop.y += drop.speed;

        // Reset once off-screen
        if (drop.y > height) {
          drop.y = Math.random() * -120;
          drop.speed = 1 + Math.random() * 2;
        }

        // Draw symbols inside stream
        const drawY = Math.floor(drop.y / fontSize) * fontSize;
        const xPos = i * fontSize + fontSize / 2;

        if (drawY > 0 && drawY < height) {
          const charIndex = Math.floor((drawY + i) % drop.chars.length);
          const char = drop.chars[charIndex];

          // Tail length fades out
          const streamAlpha = (isDark ? 0.03 : 0.02) * (1 - drawY / height);
          ctx.font = `bold ${fontSize - 2}px "Fira Code", monospace`;
          
          // Primary color of characters (Green for dark, gold/yellow for light)
          ctx.fillStyle = isDark 
            ? `rgba(16, 185, 129, ${streamAlpha * 1.5})` 
            : `rgba(217, 119, 6, ${streamAlpha * 1.5})`;
          
          ctx.fillText(char, xPos, drawY);

          // Head of the stream flash
          if (Math.random() > 0.98) {
            ctx.fillStyle = isDark ? 'rgba(52, 211, 153, 0.06)' : 'rgba(251, 191, 36, 0.04)';
            ctx.fillText(char, xPos, drawY);
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="matrix-applet-background"
      className="fixed inset-0 w-full h-full pointer-events-none -z-40 opacity-95"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}
