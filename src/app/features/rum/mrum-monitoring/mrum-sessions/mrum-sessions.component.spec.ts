import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumSessionsComponent } from './mrum-sessions.component';

describe('MrumSessionsComponent', () => {
  let component: MrumSessionsComponent;
  let fixture: ComponentFixture<MrumSessionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumSessionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
