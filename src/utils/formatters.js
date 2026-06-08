export const formatNumber = (num) => {
  if (!num && num !== 0) return 'N/A';
  return num.toLocaleString();
};
