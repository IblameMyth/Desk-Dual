/*
 * Pointer-based flick input (mouse, touch and pen all go through Pointer Events).
 * Press on a pen, drag backwards, release to flick.
 */
export class FlickInput {
  /**
   * @param {object} o
   * @param {HTMLElement} o.element       element that receives pointer events
   * @param {(e:PointerEvent)=>{x:number,y:number}} o.toWorld  client -> world coordinates
   * @param {(pt:{x:number,y:number})=>string|null} o.pick     returns the pen id under the point, or null
   * @param {Function} [o.onStart]  ({penId, start, current})
   * @param {Function} [o.onRelease] ({penId, start, current})
   * @param {Function} [o.onCancel]
   */
  constructor({ element, toWorld, pick, onStart, onRelease, onCancel }) {
    this.el = element;
    this.toWorld = toWorld;
    this.pick = pick;
    this.onStart = onStart;
    this.onRelease = onRelease;
    this.onCancel = onCancel;
    this.state = null; // { pointerId, penId, start, current }

    this._down = (e) => this._handleDown(e);
    this._move = (e) => this._handleMove(e);
    this._up = (e) => this._handleUp(e);
    this._cancel = (e) => {
      if (this.state && e.pointerId === this.state.pointerId) this.cancel();
    };
    this._blur = () => this.cancel();
    this._noMenu = (e) => e.preventDefault();

    element.style.touchAction = 'none';
    element.addEventListener('pointerdown', this._down);
    element.addEventListener('pointermove', this._move);
    element.addEventListener('pointerup', this._up);
    element.addEventListener('pointercancel', this._cancel);
    element.addEventListener('lostpointercapture', this._cancel);
    element.addEventListener('contextmenu', this._noMenu);
    window.addEventListener('blur', this._blur);
  }

  get active() {
    return this.state !== null;
  }

  cancel() {
    if (!this.state) return;
    const { pointerId } = this.state;
    this.state = null;
    try {
      this.el.releasePointerCapture(pointerId);
    } catch (_) {
      /* pointer already released */
    }
    this.onCancel?.();
  }

  destroy() {
    this.cancel();
    this.el.removeEventListener('pointerdown', this._down);
    this.el.removeEventListener('pointermove', this._move);
    this.el.removeEventListener('pointerup', this._up);
    this.el.removeEventListener('pointercancel', this._cancel);
    this.el.removeEventListener('lostpointercapture', this._cancel);
    this.el.removeEventListener('contextmenu', this._noMenu);
    window.removeEventListener('blur', this._blur);
  }

  _handleDown(e) {
    if (this.state) return; // one drag at a time
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pt = this.toWorld(e);
    const penId = this.pick(pt);
    if (!penId) return;
    e.preventDefault();
    this.el.setPointerCapture(e.pointerId);
    this.state = { pointerId: e.pointerId, penId, start: pt, current: pt };
    this.onStart?.(this.state);
  }

  _handleMove(e) {
    if (!this.state || e.pointerId !== this.state.pointerId) return;
    e.preventDefault();
    this.state.current = this.toWorld(e);
  }

  _handleUp(e) {
    if (!this.state || e.pointerId !== this.state.pointerId) return;
    this.state.current = this.toWorld(e);
    const done = this.state;
    this.state = null;
    try {
      this.el.releasePointerCapture(done.pointerId);
    } catch (_) {
      /* already released */
    }
    this.onRelease?.(done);
  }
}
