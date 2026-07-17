import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

export function uploadAudioFile(file, options = {}) {
  const formData = new FormData();
  formData.append('audio', file);

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return apiClient.post('/transcriptions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export default apiClient;
