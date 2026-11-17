import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionWaterfallComponent } from './action-waterfall.component';

describe('ActionWaterfallComponent', () => {
  let component: ActionWaterfallComponent;
  let fixture: ComponentFixture<ActionWaterfallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionWaterfallComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionWaterfallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
