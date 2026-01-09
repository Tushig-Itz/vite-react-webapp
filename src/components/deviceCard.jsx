export const DeviceCard = ({ device, isSelected, onClick }) => {
    return (
      <button
        onClick={onClick}
        className={`device-card ${isSelected ? 'selected' : ''}`}
      >
        <h3>{device.model}</h3>
        <div className="series">{device.series || 'N/A'} Series</div>
        <div className="specs">
          <div className="spec-line">
            <span style={{ color: '#9ca3af' }}>IPS:</span>
            <span>{device.ips_throughput_gbps || 'N/A'} Gbps</span>
          </div>
          <div className="spec-line">
            <span style={{ color: '#9ca3af' }}>NGFW:</span>
            <span>{device.ngfw_throughput_gbps || 'N/A'} Gbps</span>
          </div>
        </div>
      </button>
    );
  };