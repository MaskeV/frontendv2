import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodesDashboardComponent } from './nodes-dashboard.component';

describe('NodesDashboardComponent', () => {
  let component: NodesDashboardComponent;
  let fixture: ComponentFixture<NodesDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodesDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodesDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
