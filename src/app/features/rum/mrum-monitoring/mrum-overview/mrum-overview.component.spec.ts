import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MrumOverviewComponent } from './mrum-overview.component';

describe('MrumOverviewComponent', () => {
  let component: MrumOverviewComponent;
  let fixture: ComponentFixture<MrumOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MrumOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MrumOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
