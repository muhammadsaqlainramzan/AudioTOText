import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 300000,
  headers: {
    Accept: 'application/json',
  },
});

export function uploadAudioFile(file, options = {}, config = {}) {
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
    ...config,
  });
}

export function exportTranscript(payload, config = {}) {
  return apiClient.post('/transcriptions/export', payload, {
    responseType: 'blob',
    ...config,
  });
}

export function askWordMeaning(payload, config = {}) {
  return apiClient.post('/assistant/word-meaning', payload, config);
}

export default apiClient;
