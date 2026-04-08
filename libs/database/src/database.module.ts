import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoDatabaseModule } from '@chat-app/database/mongo';
import { InMemoryDatabaseModule } from '@chat-app/database/in-memory';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const dbType = process.env.DB_TYPE;

    if (!dbType) {
      throw new Error(
        'DB_TYPE environment variable is required (mongo or memory)',
      );
    }

    const databaseModule =
      dbType === 'mongo' ? MongoDatabaseModule : InMemoryDatabaseModule;

    return {
      module: DatabaseModule,
      imports: [databaseModule],
      exports: [databaseModule],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        {
          module: class DynamicDatabaseModule {},
          providers: [
            {
              provide: 'DATABASE_MODULE',
              inject: [ConfigService],
              useFactory: (config: ConfigService) => {
                const dbType = config.get<string>('DB_TYPE');
                return dbType === 'mongo'
                  ? MongoDatabaseModule
                  : InMemoryDatabaseModule;
              },
            },
          ],
        },
      ],
    };
  }
}
