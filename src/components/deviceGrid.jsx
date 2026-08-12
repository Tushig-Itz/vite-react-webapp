import { DeviceCard } from './deviceCard';

// `groups` comes from groupIntoTiers() — [{ label, hint, devices }].
// A single unlabelled group renders as a plain grid (used when the RFP filter is
// active and the list is ranked by best fit rather than by tier).
export const DeviceGrid = ({
  groups,
  selectedDevice,
  onSelectDevice,
  cardSpecs,
  compareList = [],
  onToggleCompare,
  compareFull = false,
}) => {
  return (
    <div className="device-groups">
      {groups.map((group, gi) => (
        <section className="device-group" key={group.label || gi}>
          {group.label && (
            <div className="device-group-header">
              <h3>{group.label}</h3>
              {group.hint && <span className="device-group-hint">{group.hint}</span>}
              <span className="device-group-count">{group.devices.length}</span>
            </div>
          )}
          <div className="device-grid">
            {group.devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                cardSpecs={cardSpecs}
                isSelected={selectedDevice?.id === device.id}
                onClick={() => onSelectDevice(device)}
                isCompared={compareList.some((d) => d.model === device.model)}
                onToggleCompare={onToggleCompare}
                compareFull={compareFull}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
