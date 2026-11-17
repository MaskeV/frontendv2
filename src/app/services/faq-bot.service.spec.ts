import { TestBed } from '@angular/core/testing';

import { FaqBotService } from './faq-bot.service';

describe('FaqBotService', () => {
  let service: FaqBotService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FaqBotService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
