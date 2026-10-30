/**
 * Canvas 签名面板
 * 相比原版 sign/index.html 的改进：
 * - 统一使用 Pointer Events，鼠标 / 触摸 / 手写笔一套逻辑
 * - 二次贝塞尔中点平滑算法，笔画不再呈折线锯齿
 * - 按笔画记录历史，支持撤销（原版撤销被注释不可用）
 * - 适配高分屏（devicePixelRatio），窗口尺寸变化时自动重绘
 * - 支持白色 / 透明背景导出
 *
 * @param {HTMLElement} el 挂载容器（需有宽高）
 * @param {object} option
 * @param {string} option.lineColor 画笔颜色
 * @param {number} option.lineSize 画笔粗细（CSS 像素）
 * @param {string|false} option.backgroundColor 背景色，false 表示透明
 */
function createSignaturePad(el, option = {}) {
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // 动态读取配置，外部可随时修改 option（与原 sign.js 行为一致）
  const getLineColor = () => option.lineColor || "#1f2937";
  const getLineWidth = () => option.lineSize || 3;
  const getBackground = () =>
    option.backgroundColor === false ? null : option.backgroundColor || "#ffffff";

  /** @type {{x:number,y:number}[][]} 每条笔画的点序列 */
  const strokes = [];
  let currentStroke = null;
  let isDrawing = false;

  /** 按容器尺寸 + 缩放比更新画布物理像素，并整体重绘 */
  function resize() {
    canvas.width = el.clientWidth * ratio;
    canvas.height = el.clientHeight * ratio;
    redraw();
  }

  /** 清空画布并铺背景 */
  function fillBackground() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const bg = getBackground();
    if (bg) {
      context.fillStyle = bg;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * 用中点二次贝塞尔绘制一条平滑笔画
   * @param {{x:number,y:number}[]} points
   */
  function drawStroke(points) {
    if (points.length === 0) return;
    context.beginPath();
    context.strokeStyle = getLineColor();
    context.fillStyle = getLineColor();
    context.lineWidth = getLineWidth() * ratio;
    context.lineCap = "round";
    context.lineJoin = "round";

    // 单点：点一下画个圆点
    if (points.length === 1) {
      context.arc(points[0].x * ratio, points[0].y * ratio, (getLineWidth() * ratio) / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.moveTo(points[0].x * ratio, points[0].y * ratio);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = ((points[i].x + points[i + 1].x) / 2) * ratio;
      const my = ((points[i].y + points[i + 1].y) / 2) * ratio;
      context.quadraticCurveTo(points[i].x * ratio, points[i].y * ratio, mx, my);
    }
    const last = points[points.length - 1];
    context.lineTo(last.x * ratio, last.y * ratio);
    context.stroke();
  }

  /** 全量重绘所有笔画 */
  function redraw() {
    fillBackground();
    strokes.forEach(drawStroke);
  }

  /** 事件坐标 -> canvas 内 CSS 像素坐标 */
  function toPoint(e) {
    const box = canvas.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  }

  function onPointerDown(e) {
    e.preventDefault();
    isDrawing = true;
    currentStroke = [toPoint(e)];
    strokes.push(currentStroke);
    drawStroke(currentStroke);
    canvas.setPointerCapture(e.pointerId);
    el.dispatchEvent(new CustomEvent("sign-change"));
  }

  function onPointerMove(e) {
    if (!isDrawing || !currentStroke) return;
    currentStroke.push(toPoint(e));
    // 只重绘当前笔画所在区域代价较高，签名场景笔画少，直接全量重绘保证平滑
    redraw();
  }

  function onPointerUp() {
    if (!isDrawing) return;
    isDrawing = false;
    currentStroke = null;
  }

  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.touchAction = "none"; // 禁止触摸滚动，保证签名手势
  el.appendChild(canvas);

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  resize();
  window.addEventListener("resize", resize);

  return {
    canvas,
    /** 是否画过内容 */
    isEmpty() {
      return strokes.length === 0;
    },
    /** 撤销上一笔 */
    undo() {
      strokes.pop();
      redraw();
      el.dispatchEvent(new CustomEvent("sign-change"));
    },
    /** 按当前配置重绘（背景色 / 笔触变化后调用） */
    redraw,
    /** 清空签名板 */
    reset() {
      strokes.length = 0;
      redraw();
      el.dispatchEvent(new CustomEvent("sign-change"));
    },
    /**
     * 导出图片
     * @param {string} imageType 如 "image/png"
     * @returns {string} base64，空签名返回 ""
     */
    getBase64(imageType = "image/png") {
      // 透明背景模式下画布本身未铺底色，toDataURL 直接导出透明 PNG
      if (strokes.length === 0) return "";
      return canvas.toDataURL(imageType);
    },
  };
}
