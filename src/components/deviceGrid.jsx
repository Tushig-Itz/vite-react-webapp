import { DeviceCard } from './DeviceCard';

export const DeviceGrid = ({ devices, selectedDevice, onSelectDevice }) => {
  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      <div className="device-grid">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isSelected={selectedDevice?.id === device.id}
            onClick={() => onSelectDevice(device)}
          />
        ))}
      </div>
    </div>
  );
};