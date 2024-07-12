import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ClientProxyFactory } from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { UserController } from './user.controller'
import { UserService } from './services/user.service'
import { MongoConfigService } from './services/config/mongo-config.service'
import { ConfigService } from './services/config/config.service'
import { UserSchema } from './schemas/user.schema'
import { UserLinkSchema } from './schemas/user-link.schema'
import mongoose from 'mongoose'

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: MongoConfigService
    }),
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema,
        collection: 'users'
      },
      {
        name: 'UserLink',
        schema: UserLinkSchema,
        collection: 'user_links'
      }
    ])
  ],
  controllers: [UserController],
  providers: [
    UserService,
    ConfigService,
    {
      provide: 'MAILER_SERVICE',
      useFactory: (configService: ConfigService) => {
        const mailerServiceOptions = configService.get('mailerService')
        return ClientProxyFactory.create(mailerServiceOptions)
      },
      inject: [ConfigService]
    }
  ]
})
export class UserModule implements OnModuleInit, OnModuleDestroy {
  private readonly MAX_RETRIES = 5
  private retries = 0

  onModuleInit() {
    console.log('UserModule initialized')
    this.connectWithRetry()
  }

  onModuleDestroy() {
    mongoose.connection.close()
  }

  private connectWithRetry() {
    mongoose
      .connect(process.env.MONGO_DSN)
      .then(() => {
        console.log('Mongoose connected successfully')
        this.retries = 0 // reset retries on successful connection
      })
      .catch((err) => {
        console.error('Mongoose connection error:', err)
        if (this.retries < this.MAX_RETRIES) {
          this.retries += 1
          console.log(`Retrying connection attempt ${this.retries}/${this.MAX_RETRIES}...`)
          setTimeout(this.connectWithRetry.bind(this), 5000) // wait 5 seconds before retrying
        } else {
          console.error('Max retries reached. Could not connect to MongoDB.')
        }
      })

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected')
    })
  }
}
