const TYPES = {
  Services: {
    Kubernetes: Symbol.for('Kubernetes'),
    Admission: Symbol.for('Admission'),
    Logging: Symbol.for('Logging')
  },
  Config: {
    AllowedList: Symbol.for('AllowedList'),
    BlockedList: Symbol.for('BlockedList'),
    StrictMode: Symbol.for('StrictMode'),
    Namespaces: Symbol.for('Namespaces'),
    DefaultUid: Symbol.for('DefaultUid'),
    DefaultGid: Symbol.for('DefaultGid'),
    DefaultFsGroup: Symbol.for('DefaultFsGroup'),
    TLSEnabled: Symbol.for('TLSEnabled'),
    TLSKeyPath: Symbol.for('TLSKeyPath'),
    TLSCertPath: Symbol.for('TLSCertPath'),
    SeccompProfile: Symbol.for('SeccompProfile'),
    AddSeccompProfile: Symbol.for('AddSeccompProfile'),
    PassthroughPatterns: Symbol.for('PassthroughPatterns')
  },
  K8S: {
    Config: Symbol.for('Config'),
    CoreApi: Symbol.for('CoreApi')
  }
}
export { TYPES }
