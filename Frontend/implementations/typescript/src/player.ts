import { Config, PixelStreaming } from '@epicgames-ps/lib-pixelstreamingfrontend-ue5.4';
import { Application, PixelStreamingApplicationStyle } from '@epicgames-ps/lib-pixelstreamingfrontend-ui-ue5.4';

const PixelStreamingApplicationStyles = new PixelStreamingApplicationStyle();
PixelStreamingApplicationStyles.applyStyleSheet();

declare global {
    interface Window { pixelStreaming: PixelStreaming; }
}

// ============================================================
// 客户端光标 overlay — 零服务端延迟
// ============================================================

type CursorKind = 'default' | 'crosshair';

let _cursorCanvas: HTMLCanvasElement | null = null;
let _cursorCtx: CanvasRenderingContext2D | null = null;
let _cursorX = 0;
let _cursorY = 0;
let _cursorVisible = false;
let _cursorKind: CursorKind = 'default';

// D/Q 触发十字丝，再按一次或 Escape 恢复箭头
let _interactMode: 'none' | 'measure' | 'marker' = 'none';

function setupCursorOverlay(container: HTMLElement) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
    _cursorCanvas = canvas;
    _cursorCtx = canvas.getContext('2d')!;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        _renderCursor();
    };
    resize();
    window.addEventListener('resize', resize);

    // 隐藏 OS 光标
    container.style.cursor = 'none';

    container.addEventListener('mousemove', (e: MouseEvent) => {
        _cursorX = e.clientX;
        _cursorY = e.clientY;
        _cursorVisible = true;
        _renderCursor();
    });
    container.addEventListener('mouseleave', () => {
        _cursorVisible = false;
        _cursorCtx!.clearRect(0, 0, canvas.width, canvas.height);
    });

    // 键盘追踪（只改光标形态，不拦截事件——还是会正常转发给服务端）
    // e.repeat=true 表示按住重复触发，忽略它，否则 toggle 会来回抖动
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (e.code === 'KeyD') {
            _interactMode = _interactMode === 'measure' ? 'none' : 'measure';
        } else if (e.code === 'KeyQ') {
            _interactMode = _interactMode === 'marker' ? 'none' : 'marker';
        } else if (e.code === 'Escape') {
            _interactMode = 'none';
        } else {
            return;
        }
        _cursorKind = _interactMode === 'none' ? 'default' : 'crosshair';
        _renderCursor();
    });
}

function _renderCursor() {
    const ctx = _cursorCtx;
    const canvas = _cursorCanvas;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!_cursorVisible) return;

    if (_cursorKind === 'crosshair') {
        _drawCrosshair(ctx, _cursorX, _cursorY);
    } else {
        _drawArrow(ctx, _cursorX, _cursorY);
    }
}

function _drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    // 标准箭头光标形状
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 19);
    ctx.lineTo(4.5, 14.5);
    ctx.lineTo(8.5, 21.5);
    ctx.lineTo(11, 20.5);
    ctx.lineTo(7, 13.5);
    ctx.lineTo(12.5, 13);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
}

function _drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const r = 11, gap = 3;
    // 黑色外描边
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap); ctx.lineTo(x, y + r);
    ctx.stroke();
    // 白色内线
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 中心点
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.restore();
}

// ============================================================

document.body.onload = function () {
    const config = new Config({ useUrlParams: true });
    const stream = new PixelStreaming(config);
    const application = new Application({
        stream,
        onColorModeChanged: (isLightMode) => PixelStreamingApplicationStyles.setColorMode(isLightMode)
    });
    document.body.appendChild(application.rootElement);
    window.pixelStreaming = stream;

    setupCursorOverlay(application.rootElement);
};
