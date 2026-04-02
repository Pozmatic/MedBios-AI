import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 120000, // 2 min for large PDFs
});

export const uploadReport = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return response.data;
};

export const listReports = async (page = 1, pageSize = 20) => {
  const response = await api.get(`/reports/?page=${page}&page_size=${pageSize}`);
  return response.data;
};

export const getReport = async (reportId) => {
  const response = await api.get(`/reports/${reportId}`);
  return response.data;
};

export const getKnowledgeGraphStats = async () => {
  const response = await api.get('/reports/knowledge-graph/stats');
  return response.data;
};

export const queryKnowledgeGraph = async (entity, depth = 2) => {
  const response = await api.get(`/reports/knowledge-graph/query/${entity}?depth=${depth}`);
  return response.data;
};

export const checkDrugInteractions = async (medications, labValues = null) => {
  const endpoint = labValues
    ? '/reports/drug-interactions/lab-check'
    : '/reports/drug-interactions/check';
  const payload = { medications };
  if (labValues) payload.lab_values = labValues;
  const response = await api.post(endpoint, payload);
  return response.data;
};

export const getPatientTrends = async (patientId) => {
  const response = await api.get(`/reports/patient/${patientId}/trends`);
  return response.data;
};

export const getAnalytics = async () => {
  const response = await api.get('/reports/analytics/dashboard');
  return response.data;
};

export const getReportPdfUrl = (reportId) => {
  return `${API_BASE}/api/reports/export/${reportId}/pdf`;
};

export const sendChatMessage = async (reportId, message) => {
  const response = await api.post(`/reports/${reportId}/chat`, { message });
  return response.data;
};

export const getRecommendations = async (reportId) => {
  const response = await api.get(`/reports/${reportId}/recommendations`);
  return response.data;
};

export default api;
