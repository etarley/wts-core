
import { WebSocket } from 'ws';

console.log('Running in Bun:', typeof Bun !== 'undefined');

const ws = new WebSocket('wss://echo.websocket.org');

try {
    if (typeof ws.setMaxListeners === 'function') {
        console.log('ws.setMaxListeners exists');
        ws.setMaxListeners(0);
    } else {
        console.log('ws.setMaxListeners is MISSING');
    }
} catch (e) {
    console.error('Error accessing setMaxListeners:', e);
}

ws.close();
