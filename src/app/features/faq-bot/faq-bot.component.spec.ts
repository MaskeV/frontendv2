import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaqBotComponent } from './faq-bot.component';

describe('FaqBotComponent', () => {
  let component: FaqBotComponent;
  let fixture: ComponentFixture<FaqBotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqBotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FaqBotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
