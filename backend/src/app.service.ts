import { Injectable } from '@nestjs/common';

export type HealthStatus = {
  status: 'ok';
  service: 'backend';
};

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return { status: 'ok', service: 'backend' };
  }
}
