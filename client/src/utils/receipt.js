import api from '../api/axios';

const blobToText = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });

export const downloadReceipt = async (paymentId, options = {}) => {
  const routeBase = options.routeBase || '/payments';
  const response = await api.get(`${routeBase}/${paymentId}/receipt`, { responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || '';

  if (contentType.includes('application/json')) {
    const text = await blobToText(response.data);
    const data = JSON.parse(text || '{}');
    if (data.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType || 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `receipt-${paymentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
