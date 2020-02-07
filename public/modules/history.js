import { createBrowserHistory } from 'https://cdn.pika.dev/history/v4';

export const history = createBrowserHistory();

console.debug('history 📚', history.location.pathname);
