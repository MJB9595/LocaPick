import client from './client'

export const getLocapickResults = (params) =>
  // params: { lat, lng, time, count, category }
  client.get('/locapick/search', { params }).then((r) => r.data)