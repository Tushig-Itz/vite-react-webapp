export const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    return num.toLocaleString();
  };
  
  export const formatThroughput = (value) => {
    return value ? `${value} Gbps` : 'N/A';
  };