export interface StaffMember {
  name?: string;
  matricola?: string;
  tesseraFIGC?: string;
  docIdentity?: string;
}

export interface ClubConfig {
  clubFullName: string;
  matricola: string;
  dirigente: StaffMember;
  direttoreGara: StaffMember;
  allenatore: StaffMember;
  medicoSociale: StaffMember;
  collaboratore: StaffMember;
  dirigentiForza: Array<{ name?: string; docIdentity?: string }>;
}

export const DEFAULT_CLUB_CONFIG: ClubConfig = {
  clubFullName: 'A.D.P SINAGRA CALCIO',
  matricola: '916079',
  dirigente: {},
  direttoreGara: {},
  allenatore: {},
  medicoSociale: {},
  collaboratore: {},
  dirigentiForza: [{}, {}],
};
