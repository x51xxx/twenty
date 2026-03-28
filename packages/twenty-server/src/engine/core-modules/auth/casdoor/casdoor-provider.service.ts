import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  CasdoorProviderStatus,
  WorkspaceCasdoorProviderEntity,
} from 'src/engine/core-modules/auth/casdoor/workspace-casdoor-provider.entity';

@Injectable()
export class CasdoorProviderService {
  constructor(
    @InjectRepository(WorkspaceCasdoorProviderEntity)
    private readonly casdoorProviderRepository: Repository<WorkspaceCasdoorProviderEntity>,
  ) {}

  async findById(
    id: string,
  ): Promise<WorkspaceCasdoorProviderEntity | null> {
    return this.casdoorProviderRepository.findOneBy({ id });
  }

  async findActiveByWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceCasdoorProviderEntity[]> {
    return this.casdoorProviderRepository.find({
      where: {
        workspaceId,
        status: CasdoorProviderStatus.Active,
      },
    });
  }

  async create(
    data: Partial<WorkspaceCasdoorProviderEntity>,
  ): Promise<WorkspaceCasdoorProviderEntity> {
    return this.casdoorProviderRepository.save(
      this.casdoorProviderRepository.create(data),
    );
  }

  async update(
    id: string,
    data: Partial<WorkspaceCasdoorProviderEntity>,
  ): Promise<WorkspaceCasdoorProviderEntity> {
    await this.casdoorProviderRepository.update(id, data);

    return this.casdoorProviderRepository.findOneByOrFail({ id });
  }

  async delete(id: string): Promise<void> {
    await this.casdoorProviderRepository.delete(id);
  }
}
