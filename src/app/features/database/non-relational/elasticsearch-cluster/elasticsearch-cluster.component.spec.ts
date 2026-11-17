import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElasticsearchClusterComponent } from './elasticsearch-cluster.component';

describe('ElasticsearchClusterComponent', () => {
  let component: ElasticsearchClusterComponent;
  let fixture: ComponentFixture<ElasticsearchClusterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElasticsearchClusterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElasticsearchClusterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
