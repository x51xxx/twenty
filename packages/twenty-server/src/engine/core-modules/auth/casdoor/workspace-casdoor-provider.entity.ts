import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

export enum CasdoorProviderStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

@Entity('workspaceCasdoorProvider')
export class WorkspaceCasdoorProviderEntity
  implements WorkspaceRelatedEntity
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  name: string;

  @Column({ default: CasdoorProviderStatus.Active })
  status: CasdoorProviderStatus;

  @Column()
  endpoint: string;

  @Column()
  clientId: string;

  @Column()
  clientSecret: string;

  @Column({ default: 'built-in' })
  orgName: string;

  @Column({ default: 'twenty' })
  appName: string;

  @Column()
  callbackUrl: string;

  @Column({ nullable: true })
  roleMapping: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
