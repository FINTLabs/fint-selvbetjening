export type MetadataRelation = {
  name: string;
  multiplicity: string;
  classPackageName: string;
};

export type Metadata = {
  domainName: string;
  packageName: string | null;
  resourceName: string;
  fields: string[];
  idFields: string[];
  writeable: boolean;
  relations: MetadataRelation[];
};
