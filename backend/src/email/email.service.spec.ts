import { InternalServerErrorException } from '@nestjs/common';
import { ContactSupportStatus } from '@prisma/client';

import { EmailService } from './email.service';

describe('EmailService contact support', () => {
  const buildService = () => {
    const mailerService = {
      sendMail: jest.fn(),
    };
    const configService = {
      get: jest.fn(),
    };
    const prisma = {
      contactSupportMessage: {
        create: jest.fn().mockResolvedValue({ id: 'contact-1' }),
        update: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      },
    };

    return {
      mailerService,
      prisma,
      service: new EmailService(
        mailerService as any,
        configService as any,
        prisma as any,
      ),
    };
  };

  it('sends contact support email to the fixed support mailbox', async () => {
    const { mailerService, prisma, service } = buildService();
    mailerService.sendMail.mockResolvedValue(undefined);

    await expect(
      service.sendContactSupportMessage({
        email: 'user@example.com',
        subject: 'Need help',
        message: 'Please help me reset my account.',
        ipAddress: '203.0.113.1',
        userAgent: 'jest',
      }),
    ).resolves.toEqual({
      message: 'Your message has been sent successfully.',
    });

    expect(prisma.contactSupportMessage.create).toHaveBeenCalledWith({
      data: {
        email: 'user@example.com',
        subject: 'Need help',
        message: 'Please help me reset my account.',
        ipAddress: '203.0.113.1',
        userAgent: 'jest',
      },
      select: { id: true },
    });
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'zenvy.us.support@gmail.com',
        replyTo: 'user@example.com',
        subject: '[Zenvy 聯繫客服] Need help',
      }),
    );
    expect(prisma.contactSupportMessage.update).toHaveBeenCalledWith({
      where: { id: 'contact-1' },
      data: {
        status: ContactSupportStatus.SENT,
        sentAt: expect.any(Date),
      },
    });
  });

  it('marks the record as failed when SMTP send fails', async () => {
    const { mailerService, prisma, service } = buildService();
    mailerService.sendMail.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.sendContactSupportMessage({
        email: 'user@example.com',
        subject: 'Need help',
        message: 'Please help me reset my account.',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(prisma.contactSupportMessage.update).toHaveBeenCalledWith({
      where: { id: 'contact-1' },
      data: {
        status: ContactSupportStatus.FAILED,
        errorMessage: 'SMTP unavailable',
      },
    });
  });
});
