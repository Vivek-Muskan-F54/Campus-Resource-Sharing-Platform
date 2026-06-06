import axios from 'axios'
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:8080/api'})
api.interceptors.request.use(config=>{const token=localStorage.getItem('token');if(token)config.headers.Authorization=`Bearer ${token}`;return config})
api.interceptors.response.use(r=>r,r=>{if(r.response?.status===401){localStorage.removeItem('token');localStorage.removeItem('user')}return Promise.reject(r)})
export default api
