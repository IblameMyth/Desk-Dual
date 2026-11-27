/*
 * Local fallback physics engine for Pen Fight.
 * Implements the small Matter.js API surface used by js/physics.js so the game
 * remains playable when third-party CDNs are blocked or offline.
 * MIT-style project code; no external runtime dependencies.
 */
(() => {
  if (window.Matter) return;
  const listeners = new WeakMap();
  const corners = (b) => {
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    const hx = b.width / 2, hy = b.height / 2;
    return [[-hx,-hy],[hx,-hy],[hx,hy],[-hx,hy]].map(([x,y]) => ({
      x: b.position.x + x*c - y*s,
      y: b.position.y + x*s + y*c
    }));
  };
  const bounds = (b) => {
    const pts = corners(b);
    b.bounds = {
      min: { x: Math.min(...pts.map(p=>p.x)), y: Math.min(...pts.map(p=>p.y)) },
      max: { x: Math.max(...pts.map(p=>p.x)), y: Math.max(...pts.map(p=>p.y)) }
    };
  };
  const axes = (b) => [
    { x: Math.cos(b.angle), y: Math.sin(b.angle) },
    { x: -Math.sin(b.angle), y: Math.cos(b.angle) }
  ];
  const dot = (a,b) => a.x*b.x + a.y*b.y;
  const project = (pts, axis) => {
    const vals = pts.map(p => dot(p,axis));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };
  const collision = (a,b) => {
    const pa = corners(a), pb = corners(b);
    let depth = Infinity, normal = null;
    for (const axis of [...axes(a), ...axes(b)]) {
      const x = project(pa,axis), y = project(pb,axis);
      const overlap = Math.min(x.max,y.max) - Math.max(x.min,y.min);
      if (overlap <= 0) return null;
      if (overlap < depth) { depth = overlap; normal = axis; }
    }
    const dx = b.position.x-a.position.x, dy = b.position.y-a.position.y;
    if (dx*normal.x + dy*normal.y < 0) normal = {x:-normal.x,y:-normal.y};
    return { depth, normal };
  };
  const Engine = {
    create(options={}) { const e={world:{bodies:[]}, gravity:options.gravity||{x:0,y:0,scale:0}, options}; listeners.set(e,{}); return e; },
    update(engine, delta=1000/60) {
      const ev=listeners.get(engine)||{};
      (ev.beforeUpdate||[]).forEach(fn=>fn());
      const dt=Math.min(delta,50)/16.6666667;
      for (const b of engine.world.bodies) {
        if (b.isStatic) continue;
        b.position.x += b.velocity.x*dt;
        b.position.y += b.velocity.y*dt;
        b.angle += b.angularVelocity*dt;
        b.speed=Math.hypot(b.velocity.x,b.velocity.y);
        b.angularSpeed=Math.abs(b.angularVelocity);
        bounds(b);
      }
      const pairs=[];
      const bodies=engine.world.bodies;
      for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
        const a=bodies[i], b=bodies[j];
        if(a.isStatic&&b.isStatic) continue;
        if(a.bounds.max.x < b.bounds.min.x || b.bounds.max.x < a.bounds.min.x || a.bounds.max.y < b.bounds.min.y || b.bounds.max.y < a.bounds.min.y) continue;
        const hit=collision(a,b); if(!hit) continue;
        pairs.push({bodyA:a,bodyB:b});
        const ia=a.isStatic?0:1, ib=b.isStatic?0:1, sum=ia+ib;
        if(sum) {
          const correction=(hit.depth+0.01)/sum;
          if(ia){a.position.x-=hit.normal.x*correction;a.position.y-=hit.normal.y*correction;}
          if(ib){b.position.x+=hit.normal.x*correction;b.position.y+=hit.normal.y*correction;}
          const rvx=b.velocity.x-a.velocity.x, rvy=b.velocity.y-a.velocity.y;
          const along=rvx*hit.normal.x+rvy*hit.normal.y;
          if(along<0){
            const restitution=Math.min(a.restitution||0,b.restitution||0);
            const impulse=-(1+restitution)*along/sum;
            if(ia){a.velocity.x-=impulse*hit.normal.x;a.velocity.y-=impulse*hit.normal.y;}
            if(ib){b.velocity.x+=impulse*hit.normal.x;b.velocity.y+=impulse*hit.normal.y;}
          }
        }
        bounds(a);bounds(b);
      }
      if(pairs.length) (ev.collisionStart||[]).forEach(fn=>fn({pairs}));
      for(const b of bodies){b.speed=Math.hypot(b.velocity.x,b.velocity.y);b.angularSpeed=Math.abs(b.angularVelocity);bounds(b);}
    }
  };
  const Bodies={rectangle(x,y,width,height,options={}){const b={position:{x,y},velocity:{x:0,y:0},angle:options.angle||0,angularVelocity:0,width,height,isStatic:!!options.isStatic,restitution:options.restitution||0,friction:options.friction||0,frictionAir:options.frictionAir||0,density:options.density||0,label:options.label||'Body',speed:0,angularSpeed:0};bounds(b);return b;}};
  const Body={
    setPosition(b,p){b.position={x:p.x,y:p.y};bounds(b);}, setAngle(b,a){b.angle=a;bounds(b);},
    setVelocity(b,v){b.velocity={x:v.x,y:v.y};b.speed=Math.hypot(v.x,v.y);},
    setAngularVelocity(b,v){b.angularVelocity=v;b.angularSpeed=Math.abs(v);}
  };
  const Composite={add(w,items){for(const b of (Array.isArray(items)?items:[items]))if(!w.bodies.includes(b))w.bodies.push(b);},remove(w,items){for(const b of (Array.isArray(items)?items:[items])){const i=w.bodies.indexOf(b);if(i>=0)w.bodies.splice(i,1);}}};
  const Events={on(obj,name,fn){const e=listeners.get(obj)||{};(e[name]||(e[name]=[])).push(fn);listeners.set(obj,e);}};
  window.Matter={Engine,Bodies,Body,Composite,Events};
  window.dispatchEvent(new CustomEvent('penfight-physics-ready',{detail:{fallback:true}}));
})();
