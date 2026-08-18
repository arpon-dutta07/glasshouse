"""WebSocket endpoint for real-time live connection event broadcasting."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
from typing import Set

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcasts a JSON event to all connected clients."""
        if not self.active_connections:
            return

        dead_connections = set()
        data = json.dumps(message)

        for connection in list(self.active_connections):
            try:
                await connection.send_text(data)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)


manager = ConnectionManager()


@router.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    """Streams live connection events to connected clients."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive loop
            data = await websocket.receive_text()
            # Respond to ping if received
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket error: {e}")
        manager.disconnect(websocket)
