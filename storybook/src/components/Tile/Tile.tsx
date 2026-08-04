import plusIcon from './assets/icon-plus-empty-state.svg';
import './Tile.css';

export type TileProps = {
  title: string;
  onAddPlot: () => void;
};

export function Tile({ title, onAddPlot }: TileProps) {
  return (
    <div className="tile">
      <h3 className="tile__title">{title}</h3>
      <button type="button" className="tile__empty-state" onClick={onAddPlot}>
        <span className="tile__empty-icon">
          <img src={plusIcon} alt="" />
        </span>
        <p className="tile__empty-caption">Add a plot or simulation</p>
      </button>
    </div>
  );
}
