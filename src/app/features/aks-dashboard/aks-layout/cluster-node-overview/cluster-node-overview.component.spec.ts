import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClusterNodeOverviewComponent } from './cluster-node-overview.component';

describe('ClusterNodeOverviewComponent', () => {
  let component: ClusterNodeOverviewComponent;
  let fixture: ComponentFixture<ClusterNodeOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClusterNodeOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClusterNodeOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
