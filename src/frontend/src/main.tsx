import { render } from 'preact'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './app.tsx'
import './index.css'

const queryClient = new QueryClient()

render(
    <QueryClientProvider client={queryClient}>
        <App />
    </QueryClientProvider>,
    document.getElementById('app')!
)

