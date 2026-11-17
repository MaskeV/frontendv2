import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlameViewComponent } from './flame-view.component';

describe('FlameViewComponent', () => {
  let component: FlameViewComponent;
  let fixture: ComponentFixture<FlameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlameViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlameViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
