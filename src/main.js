import './styles/main.css';
import {Game} from './game/Game.js';

try{new Game();}catch(error){
  console.error(error);const root=document.getElementById('app');root.innerHTML='<main style="max-width:620px;margin:10vh auto;background:#16313c;color:#f5f2de;padding:40px;border-radius:24px;font:18px/1.6 system-ui"><h1>KART RUSH 3D</h1><h2>Let’s get your engine running.</h2><p id="error-detail"></p><p>This game needs WebGL 2. Enable graphics acceleration in Chrome or Edge, close other graphics-heavy tabs, and reload.</p><button onclick="location.reload()" style="font:inherit;padding:12px 24px">Try again</button></main>';document.getElementById('error-detail').textContent=error.message;
}
