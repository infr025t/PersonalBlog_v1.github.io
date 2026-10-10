const canvas=document.createElement('canvas');
canvas.id='particle-background';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
const context=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
let enabled=true,width=0,height=0,points=[],frame=0,last=0,color='',pointer={x:null,y:null};
try{enabled=localStorage.getItem('background-decoration')!=='off';}catch{}
function updateColor(){color=getComputedStyle(document.body).getPropertyValue('--particles').trim()||'#678670';}
function resize(){width=innerWidth;height=innerHeight;const scale=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);context?.setTransform(scale,0,0,scale,0,0);points=Array.from({length:Math.min(99,Math.max(20,Math.round(width*height/11000)))},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.65,vy:(Math.random()-.5)*.65}));last=0;}
function line(a,b,range,opacity){const dx=a.x-b.x,dy=a.y-b.y,distance=dx*dx+dy*dy;if(distance>=range*range)return;context.globalAlpha=(1-Math.sqrt(distance)/range)*opacity;context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();return distance;}
function draw(time){frame=0;if(!enabled||motion.matches||document.hidden||!context)return;const step=last?Math.min(time-last,40)/16.667:1;last=time;context.clearRect(0,0,width,height);context.fillStyle=color;context.strokeStyle=color;context.lineWidth=.7;
 for(const p of points){p.x+=p.vx*step;p.y+=p.vy*step;if(p.x<0||p.x>width){p.x=Math.max(0,Math.min(width,p.x));p.vx*=-1;}if(p.y<0||p.y>height){p.y=Math.max(0,Math.min(height,p.y));p.vy*=-1;}context.globalAlpha=.58;context.beginPath();context.arc(p.x,p.y,1.2,0,Math.PI*2);context.fill();}
 for(let i=0;i<points.length;i++){const p=points[i];for(let j=i+1;j<points.length;j++)line(p,points[j],100,.32);if(pointer.x!==null){const distance=line(p,pointer,145,.48);if(distance>105*105){p.x-=(p.x-pointer.x)*.012*step;p.y-=(p.y-pointer.y)*.012*step;}}}
 context.globalAlpha=1;frame=requestAnimationFrame(draw);
}
function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;canvas.hidden=!enabled||motion.matches;const button=document.querySelector('#background-toggle');if(button){button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'动态背景：开':'动态背景：关';button.title=motion.matches?'系统减少动态效果设置已暂停背景动画':'切换点状动态背景';}if(enabled&&!motion.matches&&!document.hidden&&context)frame=requestAnimationFrame(draw);}
window.addEventListener('resize',()=>{resize();sync();});
window.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;pointer.x=event.clientX;pointer.y=event.clientY;},{passive:true});
window.addEventListener('pointerout',event=>{if(!event.relatedTarget)pointer={x:null,y:null};});
window.addEventListener('blur',()=>{pointer={x:null,y:null};});
document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
new MutationObserver(updateColor).observe(document.body,{attributes:true,attributeFilter:['class']});
document.querySelector('#background-toggle')?.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('background-decoration',enabled?'on':'off');}catch{}sync();});
updateColor();resize();sync();
