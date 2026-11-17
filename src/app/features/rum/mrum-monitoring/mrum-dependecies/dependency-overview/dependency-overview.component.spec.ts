import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DependencyOverviewComponent } from './dependency-overview.component';

describe('DependencyOverviewComponent', () => {
  let component: DependencyOverviewComponent;
  let fixture: ComponentFixture<DependencyOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DependencyOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DependencyOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
