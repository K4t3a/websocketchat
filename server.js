const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });
let clients = new Map(); 

server.on('connection', (socket) => {
    socket.on('message', (data) => {
        const message = JSON.parse(data);

        if (message.type === 'auth') {
            const isFirstUser = clients.size === 0;
            clients.set(socket, { name: message.name, color: message.color });

            const userList = Array.from(clients.values()).map(client => client.name);
            const welcomeMessage = isFirstUser
                ? 'Добро пожаловать. Вы первый в чате.'
                : `Добро пожаловать. В чате уже присутствуют: ${userList.join(', ')}.`;

            socket.send(JSON.stringify({ type: 'system', text: welcomeMessage }));
            broadcastUserList();

            if (!isFirstUser) {
                broadcast({ type: 'system', text: `К нам присоединился ${message.name}.` }, socket);
            }
        } else if (message.type === 'chat') {
            const sender = clients.get(socket);
            if (sender) {
                if (message.to) {
                    const recipient = Array.from(clients.entries()).find(
                        ([_, client]) => client.name === message.to
                    );
                    if (recipient) {
                        const [recipientSocket] = recipient;
                        recipientSocket.send(JSON.stringify({
                            type: 'chat',
                            text: `Личное сообщение от ${sender.name}: ${message.text}`,
                            color: sender.color,
                        }));
                        socket.send(JSON.stringify({
                            type: 'system',
                            text: `Личное сообщение отправлено ${message.to}.`,
                        }));
                    } else {
                        socket.send(JSON.stringify({
                            type: 'system',
                            text: `Пользователь ${message.to} не найден.`,
                        }));
                    }
                } else {
                    broadcast({
                        type: 'chat',
                        text: `${sender.name}: ${message.text}`,
                        color: sender.color,
                    });
                }
            }
        }
    });

    socket.on('close', () => {
        const user = clients.get(socket);
        if (user) {
            clients.delete(socket);
            broadcast({ type: 'system', text: `${user.name} нас покинул.` });
            broadcastUserList();
        }
    });
});

function broadcast(message, excludeSocket = null) {
    clients.forEach((_, clientSocket) => {
        if (clientSocket !== excludeSocket) {
            clientSocket.send(JSON.stringify(message));
        }
    });
}

function broadcastUserList() {
    const userList = Array.from(clients.values()).map(client => ({
        name: client.name,
        color: client.color,
    }));
    broadcast({ type: 'userlist', users: userList });
}

console.log('WebSocket сервер запущен на ws://localhost:8080');
