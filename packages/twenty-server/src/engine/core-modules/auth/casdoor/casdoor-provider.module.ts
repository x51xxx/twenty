import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkspaceCasdoorProviderEntity } from 'src/engine/core-modules/auth/casdoor/workspace-casdoor-provider.entity';
import { CasdoorProviderService } from 'src/engine/core-modules/auth/casdoor/casdoor-provider.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceCasdoorProviderEntity])],
  providers: [CasdoorProviderService],
  exports: [CasdoorProviderService],
})
export class CasdoorProviderModule {}
