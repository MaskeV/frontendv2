import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserVersionComponent } from './browser-version.component';

describe('BrowserVersionComponent', () => {
  let component: BrowserVersionComponent;
  let fixture: ComponentFixture<BrowserVersionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserVersionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
