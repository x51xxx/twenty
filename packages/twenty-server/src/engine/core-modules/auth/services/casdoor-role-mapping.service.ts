import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

@Injectable()
export class CasdoorRoleMappingService {
  private readonly logger = new Logger(CasdoorRoleMappingService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
    private readonly userRoleService: UserRoleService,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  private getRoleMapping(): Record<string, string> {
    const rawMapping = this.twentyConfigService.get('CASDOOR_ROLE_MAPPING');

    if (!rawMapping) {
      return {};
    }

    try {
      return JSON.parse(rawMapping);
    } catch {
      this.logger.warn('Invalid CASDOOR_ROLE_MAPPING JSON, ignoring');

      return {};
    }
  }

  async resolveRoleIdFromCasdoorRoles(
    casdoorRoles: string[],
    workspaceId: string,
  ): Promise<string | undefined> {
    const mapping = this.getRoleMapping();

    if (Object.keys(mapping).length === 0) {
      return undefined;
    }

    for (const casdoorRole of casdoorRoles) {
      const twentyRoleLabel = mapping[casdoorRole];

      if (!twentyRoleLabel) {
        continue;
      }

      const role = await this.roleRepository.findOne({
        where: {
          label: twentyRoleLabel,
          workspaceId,
          canBeAssignedToUsers: true,
        },
      });

      if (role) {
        return role.id;
      }

      this.logger.warn(
        `Casdoor role "${casdoorRole}" mapped to Twenty role "${twentyRoleLabel}" but role not found in workspace ${workspaceId}`,
      );
    }

    return undefined;
  }

  async syncRoleForUser(
    casdoorRoles: string[],
    userWorkspaceId: string,
    workspaceId: string,
  ): Promise<void> {
    const resolvedRoleId = await this.resolveRoleIdFromCasdoorRoles(
      casdoorRoles,
      workspaceId,
    );

    if (!resolvedRoleId) {
      return;
    }

    const currentRoleId =
      await this.userRoleService.getRoleIdForUserWorkspace(
        userWorkspaceId,
        workspaceId,
      );

    if (currentRoleId === resolvedRoleId) {
      return;
    }

    this.logger.log(
      `Syncing Casdoor role for user-workspace ${userWorkspaceId}: ${currentRoleId} → ${resolvedRoleId}`,
    );

    await this.userRoleService.assignRoleToManyUserWorkspace({
      workspaceId,
      userWorkspaceIds: [userWorkspaceId],
      roleId: resolvedRoleId,
    });
  }
}
