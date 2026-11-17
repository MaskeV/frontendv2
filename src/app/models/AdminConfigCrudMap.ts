export interface TabPermission {
  tabVisibility: 'true' | 'false';
  create?: 'true' | 'false';
  read?: 'true' | 'false';
  update?: 'true' | 'false';
  delete?: 'true' | 'false';
}

export interface AdminConfigCrudMap {
  user?: TabPermission;
  role?: TabPermission;
  feature?: TabPermission;
  featureGraphMapping?: TabPermission;
  interfaceConfig?: TabPermission;
  infraGroup?: TabPermission;
  applicationIpMapping?: TabPermission;
  dataSource?: TabPermission;
  firewall?: TabPermission; 
  client?: TabPermission;
  LicenseGeneration?: TabPermission;
  resourceMapping?: TabPermission;
  'proxy-config'?: TabPermission;
  'network-config'?: TabPermission;
  [key: string]: TabPermission | undefined;
}
