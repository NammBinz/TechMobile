// Cấu hình axios gọi API từ json-server
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000'
})

export default api