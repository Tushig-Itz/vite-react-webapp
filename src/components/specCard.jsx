export const SpecCard = ({ icon: Icon, title, children }) => {
    return (
      <div className="spec-card">
        <div className="spec-card-header">
          <Icon size={20} />
          <h3>{title}</h3>
        </div>
        <div>{children}</div>
      </div>
    );
  };
  
  export const SpecRow = ({ label, value, unit = '' }) => {
    return (
      <div className="spec-row">
        <span className="spec-label">{label}</span>
        <span className="spec-value">
          {value || value === 0 ? (
            <>
              {value}
              {unit && <span className="unit">{unit}</span>}
            </>
          ) : (
            <span style={{ color: '#6b7280' }}>N/A</span>
          )}
        </span>
      </div>
    );
  };