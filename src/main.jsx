import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import {AuthProvider} from './context/AuthContext'
import {AppProvider} from './context/AppContext'
import {initializeDB} from './db/localDB'
import {initializePostgres} from './db/postgresSync'
import './App.css'

initializeDB().then(async () => {
  await initializePostgres()
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </React.StrictMode>
  )
})

