import json
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

ws_router = APIRouter()


class WebSocketManager:
    """Manages WebSocket connections per tenant."""

    def __init__(self):
        # tenant_id -> set of WebSocket connections
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, tenant_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[tenant_id].add(ws)

    def disconnect(self, tenant_id: str, ws: WebSocket):
        self._connections[tenant_id].discard(ws)
        if not self._connections[tenant_id]:
            del self._connections[tenant_id]

    async def broadcast_to_tenant(self, tenant_id: str, data: dict):
        dead = set()
        for ws in self._connections.get(tenant_id, set()):
            try:
                if ws.client_state == WebSocketState.CONNECTED:
                    await ws.send_text(json.dumps(data))
                else:
                    dead.add(ws)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[tenant_id].discard(ws)

    def active_count(self, tenant_id: str) -> int:
        return len(self._connections.get(tenant_id, set()))


ws_manager = WebSocketManager()


@ws_router.websocket("/tenants/{tenant_id}/live")
async def tenant_live_feed(websocket: WebSocket, tenant_id: str):
    """
    WebSocket endpoint for real-time tenant events.
    Client should send: {"token": "<jwt>"}
    """
    await ws_manager.connect(tenant_id, websocket)
    try:
        while True:
            # Keep alive — client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(tenant_id, websocket)


@ws_router.websocket("/executions/{execution_id}/live")
async def execution_live_feed(websocket: WebSocket, execution_id: str):
    """Live feed for a specific workflow execution."""
    # Use execution_id as the channel key
    await ws_manager.connect(f"exec:{execution_id}", websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(f"exec:{execution_id}", websocket)
